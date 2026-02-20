# Mira — Screen Annotation Overlay

![Mira toolbar preview](docs/preview.svg)

> show what you mean.

Mira is an always-on-top desktop overlay for live explanations on screen. You can draw, add geometric forms, spotlight the cursor, and clear instantly with shortcuts.

Built with Tauri 2, React 19, and Rust.

## Project Info

- Author: Pedro Santos
- Repository: [https://github.com/p-c-g-s/MIRA](https://github.com/p-c-g-s/MIRA)

## Features

- Transparent full-screen overlay above any app
- Draggable floating toolbar (always on top)
- Drawing tools: pen, line, rectangle, ellipse, arrow
- Collapsible color palette and adjustable stroke size
- Undo, redo, clear
- Spotlight mode (including pass-through mode)
- Multi-monitor overlays
- Global shortcuts for fast control

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘⇧X` | Toggle overlay on / off |
| `⌘⇧D` | Toggle draw mode |
| `⌘⇧C` | Clear canvas |
| `⌘⇧Z` | Undo |
| `⌘⇧Y` | Redo |
| `⌘⇧S` | Toggle spotlight |

> On macOS, grant Accessibility permissions in System Settings for global shortcuts.

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)
- macOS (primary tested target)

### Development

```bash
bun install
bun run tauri dev
```

### Build

```bash
bun run tauri build
```

## Architecture

Two-window setup:

- `overlay*`: transparent drawing windows (one per monitor)
- `toolbar`: floating control window

`App.tsx` routes by window label. Toolbar actions invoke Rust commands, and Rust emits events back to overlay windows.

## Key Files

- `src/components/Toolbar.tsx`
- `src/components/Canvas.tsx`
- `src/hooks/useDrawing.ts`
- `src/types/index.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`
