# Next Steps

Track of planned improvements across upcoming milestones.

---

## MVP2 — Polish

### ⌘⇧Y redo shortcut
Redo is already implemented in `useDrawing` and wired to the toolbar button. Add the global keyboard shortcut:
- Register `Shortcut::new(meta_shift, Code::KeyY)` in `register_shortcuts` (lib.rs)
- Emit `shortcut-redo` to overlay in `handle_shortcut`

### Toolbar position persistence
The toolbar resets to bottom-center on every launch. Persist its position across sessions:
- On toolbar `moved` event, save `{ x, y }` to a JSON file via a Rust command
- On `setup_windows`, read the saved position and apply it before showing the toolbar
- Use `tauri::api::path::app_data_dir` for the storage path

---

## MVP3 — Power Features

### Spotlight in pass-through mode
Currently the spotlight ring only works when draw mode is active (overlay captures mouse events). In pass-through mode the overlay doesn't receive cursor positions.

Fix: Rust-side cursor polling using `CGEventSource` on macOS:
- Spawn a background thread that polls `CGEventSource::mouseLocation()` on a ~16ms interval
- Emit cursor position events to the overlay via `app.emit_to("overlay", "cursor-moved", { x, y })`
- Canvas listens for `cursor-moved` to update spotlight position even in pass-through mode

### Multi-monitor support
Currently the overlay covers only the primary monitor.

Fix: enumerate all monitors in `setup_windows` using `app.available_monitors()` and spawn a `WebviewWindowBuilder` overlay for each one, then track which toolbar monitor the toolbar is on and size overlays accordingly.

---

## Future Ideas

- **Stroke persistence** — save/load annotation sessions to disk
- **Arrow and shape tools** — straight lines, rectangles, circles via click-drag
- **Text annotations** — floating text labels on the overlay
- **Presentation mode** — auto-hide toolbar after N seconds of inactivity, show on hover
- **Colour picker** — freeform colour input in addition to the 6 presets
- **Export** — screenshot the current annotations to clipboard or file
- **Windows / Linux support** — validate transparent overlay on other platforms (may need platform-specific adjustments to the private API config)
