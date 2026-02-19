import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PRESET_COLORS, PEN_SIZES } from "../types";

export function Toolbar() {
  const [overlayVisible, setOverlayVisible]     = useState(true);
  const [drawingEnabled, setDrawingEnabled]     = useState(false);
  const [spotlightEnabled, setSpotlightEnabled] = useState(false);
  const [currentColor, setCurrentColor]         = useState<string>(PRESET_COLORS[0]);
  const [currentSize, setCurrentSize]           = useState<number>(6);

  // ── Overlay state changes ────────────────────────────────────────────────

  const applyOverlayVisible = useCallback(async (visible: boolean) => {
    setOverlayVisible(visible);
    await invoke("set_overlay_visible", { visible });
    if (!visible) {
      setDrawingEnabled(false);
      await invoke("set_overlay_passthrough", { passThrough: true });
    }
  }, []);

  const applyDrawingEnabled = useCallback(async (enabled: boolean) => {
    setDrawingEnabled(enabled);
    await invoke("set_overlay_passthrough", { passThrough: !enabled });
    await invoke("emit_to_overlay", { event: "drawing-toggled", payload: { enabled } });
  }, []);

  const applyColor = useCallback(async (color: string) => {
    setCurrentColor(color);
    await invoke("emit_to_overlay", { event: "color-changed", payload: { color } });
  }, []);

  const applySize = useCallback(async (size: number) => {
    setCurrentSize(size);
    await invoke("emit_to_overlay", { event: "size-changed", payload: { size } });
  }, []);

  const applySpotlight = useCallback(async (enabled: boolean) => {
    setSpotlightEnabled(enabled);
    await invoke("emit_to_overlay", { event: "spotlight-toggled", payload: { enabled } });
  }, []);

  const handleClear = useCallback(async () => {
    await invoke("emit_to_overlay", { event: "shortcut-clear", payload: null });
  }, []);

  const handleUndo = useCallback(async () => {
    await invoke("emit_to_overlay", { event: "shortcut-undo", payload: null });
  }, []);

  const handleRedo = useCallback(async () => {
    await invoke("emit_to_overlay", { event: "shortcut-redo", payload: null });
  }, []);

  const handleQuit = useCallback(() => getCurrentWindow().close(), []);

  // ── Global shortcut listeners ────────────────────────────────────────────

  useEffect(() => {
    const subs: Array<() => void> = [];
    (async () => {
      subs.push(await listen("shortcut-toggle",      () => applyOverlayVisible(!overlayVisible)));
      subs.push(await listen("shortcut-clear",       () => handleClear()));
      subs.push(await listen("shortcut-spotlight",   () => applySpotlight(!spotlightEnabled)));
      subs.push(await listen("shortcut-draw-toggle", () => applyDrawingEnabled(!drawingEnabled)));
    })();
    return () => subs.forEach((fn) => fn());
  }, [overlayVisible, drawingEnabled, spotlightEnabled, applyOverlayVisible, applyDrawingEnabled, applySpotlight, handleClear]);

  // ── Drag ─────────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    await getCurrentWindow().startDragging();
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      onMouseDown={handleDragStart}
      className="flex items-center gap-2 px-3 h-16 bg-neutral-900 rounded-xl shadow-2xl select-none"
      style={{ width: 380 }}
    >
      {/* Toggle visibility */}
      <Btn active={overlayVisible} onClick={() => applyOverlayVisible(!overlayVisible)} title="Toggle (⌘⇧X)">
        <EyeIcon on={overlayVisible} />
      </Btn>

      <Sep />

      {/* Pen */}
      <Btn active={drawingEnabled} disabled={!overlayVisible} onClick={() => applyDrawingEnabled(!drawingEnabled)} title="Draw (⌘⇧D)">
        <PenIcon />
      </Btn>

      {/* Spotlight */}
      <Btn active={spotlightEnabled} disabled={!overlayVisible} onClick={() => applySpotlight(!spotlightEnabled)} title="Spotlight (⌘⇧S)">
        <SpotIcon />
      </Btn>

      <Sep />

      {/* Colors */}
      <div className="flex gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => applyColor(c)}
            className="w-5 h-5 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c,
              borderColor: currentColor === c ? "#fff" : "transparent",
              transform: currentColor === c ? "scale(1.25)" : "scale(1)",
            }}
          />
        ))}
      </div>

      <Sep />

      {/* Pen sizes */}
      <div className="flex gap-1 items-center">
        {PEN_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => applySize(s)}
            className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-neutral-700"
            style={{ backgroundColor: currentSize === s ? "#404040" : "transparent" }}
          >
            <div className="rounded-full bg-white" style={{ width: s, height: s }} />
          </button>
        ))}
      </div>

      <Sep />

      {/* Undo / Redo / Clear */}
      <Btn onClick={handleUndo} title="Undo (⌘⇧Z)"><UndoIcon /></Btn>
      <Btn onClick={handleRedo} title="Redo"><RedoIcon /></Btn>
      <Btn onClick={handleClear} title="Clear (⌘⇧C)"><TrashIcon /></Btn>

      <Sep />

      {/* Quit */}
      <Btn onClick={handleQuit} title="Quit"><QuitIcon /></Btn>
    </div>
  );
}

// ── Small reusables ───────────────────────────────────────────────────────────

function Btn({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className={[
        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white",
        active ? "bg-blue-600 hover:bg-blue-500" : "hover:bg-neutral-700",
        disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-8 bg-neutral-700 mx-0.5 flex-shrink-0" />;
}

// Inline SVG icons (stroke="currentColor", no icon lib needed)
function EyeIcon({ on }: { on: boolean }) {
  return on
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
function PenIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></svg>; }
function SpotIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>; }
function UndoIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>; }
function RedoIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>; }
function TrashIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function QuitIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
