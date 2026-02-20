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
Status: completed.

- Added Rust-side cursor polling (~16ms) via `app.cursor_position()`.
- Overlay now receives `cursor-moved` events with logical coordinates.
- Canvas spotlight listens to `cursor-moved` and renders even when drawing mode is off.

### Multi-monitor support
Status: completed.

- `setup_windows` now enumerates `app.available_monitors()`.
- Reuses `overlay` for primary monitor and creates `overlay-{n}` windows for additional monitors.
- Overlay-targeted Rust commands/events now broadcast to all `overlay*` windows.
- Frontend routes any `overlay*` label to the same `Canvas` component.

---

## Future Ideas

- **Stroke persistence** — save/load annotation sessions to disk
- **Arrow and shape tools** — straight lines, rectangles, circles via click-drag
- **Text annotations** — floating text labels on the overlay
- **Presentation mode** — auto-hide toolbar after N seconds of inactivity, show on hover
- **Colour picker** — freeform colour input in addition to the 6 presets
- **Export** — screenshot the current annotations to clipboard or file
- **Windows / Linux support** — validate transparent overlay on other platforms (may need platform-specific adjustments to the private API config)
