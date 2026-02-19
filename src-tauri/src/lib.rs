use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

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
        .map_err(|e| e.to_string())?;

    // When *entering* draw mode the overlay captures all input — re-raise the
    // toolbar so it stays clickable for tool changes and exiting draw mode.
    // Only do this on enter (pass_through=false); skip on exit to avoid the
    // window-level toggle causing a cursor jump.
    if !pass_through {
        if let Some(toolbar) = app.get_webview_window("toolbar") {
            let _ = toolbar.set_always_on_top(false);
            let _ = toolbar.set_always_on_top(true);
        }
    }

    Ok(())
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

    // Position toolbar bottom-center of the primary monitor
    let toolbar_phys_w = (380.0 * scale) as i32;
    let toolbar_phys_h = (64.0 * scale) as i32;
    let margin_phys = (24.0 * scale) as i32;
    let toolbar_x = mon_pos.x + (mon_size.width as i32 - toolbar_phys_w) / 2;
    let toolbar_y = mon_pos.y + mon_size.height as i32 - toolbar_phys_h - margin_phys;
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
