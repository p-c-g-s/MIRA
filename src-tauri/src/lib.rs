use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

const TOOLBAR_POSITION_FILE: &str = "toolbar-position.json";
const TOOLBAR_LOGICAL_WIDTH: f64 = 468.0;
const TOOLBAR_LOGICAL_HEIGHT: f64 = 60.0;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
struct ToolbarPosition {
    x: i32,
    y: i32,
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Toggle pass-through on the overlay window.
/// pass_through=true  → clicks fall through to apps below (overlay not drawing)
/// pass_through=false → overlay captures clicks (drawing mode)
#[tauri::command]
fn set_overlay_passthrough(app: AppHandle, pass_through: bool) -> Result<(), String> {
    let overlay: WebviewWindow = app
        .get_webview_window("overlay")
        .ok_or("overlay window not found")?;
    overlay
        .set_ignore_cursor_events(pass_through)
        .map_err(|e| e.to_string())
}

/// Show or hide the overlay window.
#[tauri::command]
fn set_overlay_visible(app: AppHandle, visible: bool) -> Result<(), String> {
    let overlay: WebviewWindow = app
        .get_webview_window("overlay")
        .ok_or("overlay window not found")?;
    if visible {
        overlay.show().map_err(|e| e.to_string())
    } else {
        overlay.hide().map_err(|e| e.to_string())
    }
}

/// Bridge: toolbar frontend calls this to push events to the overlay window.
/// Avoids needing core:event:allow-emit-to permission on the frontend.
#[tauri::command]
fn emit_to_overlay(app: AppHandle, event: String, payload: serde_json::Value) -> Result<(), String> {
    app.emit_to("overlay", &event, payload)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_toolbar_position(app: AppHandle, x: i32, y: i32) -> Result<(), String> {
    let pos = ToolbarPosition { x, y };
    let path = toolbar_position_path(&app).map_err(|e| e.to_string())?;
    let data = serde_json::to_vec(&pos).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

// ── Entry Point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    handle_shortcut(app, shortcut);
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_overlay_passthrough,
            set_overlay_visible,
            emit_to_overlay,
            save_toolbar_position,
        ])
        .setup(|app| {
            setup_windows(app)?;
            if let Err(e) = register_shortcuts(app) {
                eprintln!("Global shortcuts unavailable (grant Accessibility permission): {e}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ── Setup ─────────────────────────────────────────────────────────────────────

fn setup_windows(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let overlay: WebviewWindow = app
        .get_webview_window("overlay")
        .ok_or("overlay window missing")?;
    let toolbar: WebviewWindow = app
        .get_webview_window("toolbar")
        .ok_or("toolbar window missing")?;

    let monitor = overlay.primary_monitor()?.ok_or("no primary monitor")?;
    let mon_size = monitor.size();
    let mon_pos = monitor.position();
    let work_area = monitor.work_area();
    let scale = monitor.scale_factor();

    // Resize overlay to cover the full primary monitor
    overlay.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: mon_size.width,
        height: mon_size.height,
    }))?;
    overlay.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: mon_pos.x,
        y: mon_pos.y,
    }))?;
    overlay.set_ignore_cursor_events(true)?; // start in pass-through
    overlay.show()?;

    // Re-raise toolbar so it sits above the overlay in z-order from the start
    toolbar.set_always_on_top(false)?;
    toolbar.set_always_on_top(true)?;

    // Position toolbar top-center inside monitor work area by default.
    let toolbar_phys_w = (TOOLBAR_LOGICAL_WIDTH * scale) as i32;
    let toolbar_phys_h = (TOOLBAR_LOGICAL_HEIGHT * scale) as i32;
    let margin_phys = (24.0 * scale) as i32;
    let default_toolbar_x = work_area.position.x + (work_area.size.width as i32 - toolbar_phys_w) / 2;
    let default_toolbar_y = work_area.position.y + margin_phys;

    let saved = load_toolbar_position(&app.handle())
        .map(|pos| clamp_toolbar_position(pos, work_area, toolbar_phys_w, toolbar_phys_h));
    let (toolbar_x, toolbar_y) = saved
        .map(|pos| (pos.x, pos.y))
        .unwrap_or((default_toolbar_x, default_toolbar_y));

    toolbar.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: toolbar_x,
        y: toolbar_y,
    }))?;

    Ok(())
}

fn register_shortcuts(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let meta_shift = Some(Modifiers::META | Modifiers::SHIFT);
    app.global_shortcut().register_multiple([
        Shortcut::new(meta_shift, Code::KeyX), // toggle overlay
        Shortcut::new(meta_shift, Code::KeyC), // clear
        Shortcut::new(meta_shift, Code::KeyZ), // undo
        Shortcut::new(meta_shift, Code::KeyS), // spotlight
        Shortcut::new(meta_shift, Code::KeyD), // toggle draw mode
    ])?;
    Ok(())
}

fn handle_shortcut(app: &AppHandle, shortcut: &Shortcut) {
    match shortcut.key {
        Code::KeyX => {
            let _ = app.emit_to("toolbar", "shortcut-toggle", ());
        }
        Code::KeyC => {
            let _ = app.emit_to("overlay", "shortcut-clear", ());
            let _ = app.emit_to("toolbar", "shortcut-clear", ());
        }
        Code::KeyZ => {
            let _ = app.emit_to("overlay", "shortcut-undo", ());
        }
        Code::KeyS => {
            let _ = app.emit_to("toolbar", "shortcut-spotlight", ());
        }
        Code::KeyD => {
            let _ = app.emit_to("toolbar", "shortcut-draw-toggle", ());
        }
        _ => {}
    }
}

fn toolbar_position_path(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut dir = app.path().app_data_dir()?;
    fs::create_dir_all(&dir)?;
    dir.push(TOOLBAR_POSITION_FILE);
    Ok(dir)
}

fn load_toolbar_position(app: &AppHandle) -> Option<ToolbarPosition> {
    let path = toolbar_position_path(app).ok()?;
    let data = fs::read(path).ok()?;
    serde_json::from_slice::<ToolbarPosition>(&data).ok()
}

fn clamp_toolbar_position(
    pos: ToolbarPosition,
    work_area: &tauri::PhysicalRect<i32, u32>,
    toolbar_w: i32,
    toolbar_h: i32,
) -> ToolbarPosition {
    let min_x = work_area.position.x;
    let max_x = work_area.position.x + work_area.size.width as i32 - toolbar_w;
    let min_y = work_area.position.y;
    let max_y = work_area.position.y + work_area.size.height as i32 - toolbar_h;

    ToolbarPosition {
        x: pos.x.clamp(min_x, max_x),
        y: pos.y.clamp(min_y, max_y),
    }
}
