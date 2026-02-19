import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDrawing } from "../hooks/useDrawing";
import { Spotlight } from "./Spotlight";

export function Canvas() {
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(6);
  const [spotlightEnabled, setSpotlightEnabled] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const { canvasRef, undo, clear } = useDrawing({ color, lineWidth, enabled: drawingEnabled });

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const subs: Array<() => void> = [];
    (async () => {
      subs.push(await listen<{ enabled: boolean }>("drawing-toggled",   (e) => setDrawingEnabled(e.payload.enabled)));
      subs.push(await listen<{ color: string }>("color-changed",        (e) => setColor(e.payload.color)));
      subs.push(await listen<{ size: number }>("size-changed",          (e) => setLineWidth(e.payload.size)));
      subs.push(await listen<{ enabled: boolean }>("spotlight-toggled", (e) => setSpotlightEnabled(e.payload.enabled)));
      subs.push(await listen("shortcut-clear", () => clear()));
      subs.push(await listen("shortcut-undo",  () => undo()));
    })();
    return () => subs.forEach((fn) => fn());
  }, [clear, undo]);

  return (
    <div className="fixed inset-0 w-full h-full" style={{ cursor: drawingEnabled ? "crosshair" : "default" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: "none" }} />
      {spotlightEnabled && drawingEnabled && <Spotlight x={cursor.x} y={cursor.y} />}
    </div>
  );
}
