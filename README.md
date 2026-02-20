# Mira — Screen Annotation Overlay

> *show what you mean.*

Mira is a lightweight, always-on-top drawing overlay for live screen explanations. Enable draw mode and annotate anything on your screen — demos, code reviews, design walkthroughs — then clear it all away in one shortcut.

Built with Tauri 2, React 19, and Rust.

---

## Features

- **Transparent full-screen overlay** — draw on top of any app, zero interference when idle
- **Floating toolbar** — draggable, always-on-top control panel
- **Freehand drawing** with Pointer Events API and Retina-quality canvas (DPR scaling)
- **6 preset colours** and **3 pen sizes**
- **Undo / Redo / Clear**
- **Spotlight ring** — highlight the cursor area during explanations
- **Global keyboard shortcuts** — control everything without touching the toolbar
- **Click-through when idle** — overlay is completely invisible to clicks when draw mode is off

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘⇧X` | Toggle overlay on / off |
| `⌘⇧D` | Toggle draw mode |
| `⌘⇧C` | Clear canvas |
| `⌘⇧Z` | Undo last stroke |
| `⌘⇧Y` | Redo last undone stroke |
| `⌘⇧S` | Toggle spotlight |

> **Note:** Shortcuts require Accessibility permission on macOS. On first launch, grant access in *System Settings → Privacy & Security → Accessibility*.

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)
- macOS (primary target — Linux/Windows untested)

### Development

```bash
bun install
bun run tauri dev
```

### Production build

```bash
bun run tauri build
```

---

## Architecture

Two-window Tauri design:

```
┌─────────────────────────────────────────┐
│  overlay (full-screen, transparent)     │  ← HTML Canvas, always-on-top
│  pass-through when draw mode is off     │
└─────────────────────────────────────────┘
┌──────────────────┐
│  toolbar (504×60)│  ← floating control panel, above overlay in z-order
└──────────────────┘
```

Both windows load the same Vite dev server. `App.tsx` routes by `getCurrentWindow().label` — no router library.

**State flow:**
```
Toolbar button click
  → invoke Rust command
  → Rust emits event to overlay window
  → Canvas listener updates local state
```

Global shortcuts are registered Rust-side only via `tauri-plugin-global-shortcut`. The frontend never touches shortcut JS APIs.

### Stack

| Layer | Tech |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Rust |
| Drawing | HTML Canvas API + Pointer Events |

### Key files

```
src/
  App.tsx                  # window-label router
  components/
    Toolbar.tsx            # floating control panel
    Canvas.tsx             # full-screen drawing surface
    Spotlight.tsx          # cursor highlight ring
  hooks/
    useDrawing.ts          # pointer events, stroke stack, undo/redo
  types/index.ts           # shared types and constants
src-tauri/
  src/lib.rs               # Tauri commands, window setup, global shortcuts
  tauri.conf.json          # two-window app config
  capabilities/default.json
```

---

## Known Limitations

- **macOS only (tested)** — transparent overlay windows require the macOS private API
- **Single monitor** — overlay covers the primary monitor only; multi-monitor support is planned (MVP3)
- **Accessibility permission required** — global shortcuts use `CGEventTap` and silently fail without it
- **No stroke persistence** — strokes live in memory for the lifetime of the session; hiding the overlay preserves them, quitting loses them
- **Toolbar persistence scope** — toolbar position persists and can be reset from the toolbar; currently scoped to the primary monitor flow
