# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use `bun` as the package manager.

```bash
# Start full dev environment (Tauri + Vite frontend)
bun run tauri dev

# Build production app
bun run tauri build

# Frontend only (no Tauri window)
bun run dev

# Type-check frontend
bunx tsc --noEmit
```

For Rust backend changes, Cargo commands run from `src-tauri/`:
```bash
cargo check          # Check Rust code
cargo clippy         # Lint Rust code
cargo test           # Run Rust tests
```

## Architecture

This is a **Tauri 2.x desktop app** with a React/TypeScript frontend and Rust backend.

```
src/              # React + TypeScript frontend (Vite)
src-tauri/        # Rust backend (Tauri)
  src/lib.rs      # Tauri command handlers (main logic lives here)
  src/main.rs     # Binary entry point — calls lib::run()
  tauri.conf.json # App config: window size, bundle targets, dev URL
  Cargo.toml      # Rust dependencies
```

### Frontend ↔ Backend Communication

Frontend calls Rust via Tauri's IPC:
```ts
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { param: value });
```

Rust side — commands are annotated with `#[tauri::command]` and registered in `lib.rs` via `.invoke_handler(tauri::generate_handler![...])`.

### Key Config

- Dev server: `http://localhost:1420` (fixed — required for Tauri)
- HMR port: `1421`
- App identifier: `com.melro-io.mira`
- Frontend dist output: `dist/` (consumed by Tauri bundler)
