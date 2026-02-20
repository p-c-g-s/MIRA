# Next Steps

Track of planned improvements across upcoming milestones.

---

## MVP2 — Polish

Status: completed.

- Added global redo shortcut `⌘⇧Y` in Rust shortcut registration and event handling.
- Toolbar is draggable via explicit handle and persists position between launches.
- Default toolbar placement now uses monitor work area top-center (avoids macOS dock overlap).
- Added toolbar reset action to return to default position and clear persisted position.

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
