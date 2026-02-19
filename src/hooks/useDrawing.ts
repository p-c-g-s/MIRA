import { useRef, useCallback, useEffect } from "react";
import type { Stroke, Point } from "../types";

interface UseDrawingOptions {
  color: string;
  lineWidth: number;
  enabled: boolean;
}

export function useDrawing({ color, lineWidth, enabled }: UseDrawingOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const currentPointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d") ?? null, []);

  const replayStrokes = useCallback((strokes: Stroke[]) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [getCtx]);

  // Resize canvas to window, applying DPR for crisp Retina rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      replayStrokes(strokesRef.current);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [replayStrokes]);

  // Attach pointer listeners only when drawing is enabled
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const onDown = (e: PointerEvent) => {
      isDrawingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentPointsRef.current = [pt];
      const ctx = getCtx();
      if (!ctx) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(pt.x, pt.y);
    };

    const onMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentPointsRef.current.push(pt);
      const ctx = getCtx();
      if (!ctx) return;
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    };

    const onUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      strokesRef.current = [
        ...strokesRef.current,
        { points: [...currentPointsRef.current], color, width: lineWidth },
      ];
      redoStackRef.current = []; // clear redo on new stroke
      currentPointsRef.current = [];
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [enabled, color, lineWidth, getCtx]);

  const undo = useCallback(() => {
    if (!strokesRef.current.length) return;
    const last = strokesRef.current[strokesRef.current.length - 1]!;
    redoStackRef.current = [...redoStackRef.current, last];
    strokesRef.current = strokesRef.current.slice(0, -1);
    replayStrokes(strokesRef.current);
  }, [replayStrokes]);

  const redo = useCallback(() => {
    if (!redoStackRef.current.length) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1]!;
    strokesRef.current = [...strokesRef.current, next];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    replayStrokes(strokesRef.current);
  }, [replayStrokes]);

  const clear = useCallback(() => {
    strokesRef.current = [];
    redoStackRef.current = [];
    currentPointsRef.current = [];
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [getCtx]);

  return { canvasRef, undo, redo, clear };
}
