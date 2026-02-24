import { useRef, useCallback, useEffect } from "react";
import type { Stroke, Point, Tool } from "../types";

// Helper functions for Shift-key constraints
function constrainTo45Degrees(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Round to nearest 45° (π/4 radians)
  const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

  return {
    x: start.x + Math.cos(snapAngle) * distance,
    y: start.y + Math.sin(snapAngle) * distance,
  };
}

function constrainToSquare(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const maxDist = Math.max(Math.abs(dx), Math.abs(dy));

  return {
    x: start.x + (dx > 0 ? maxDist : -maxDist),
    y: start.y + (dy > 0 ? maxDist : -maxDist),
  };
}

function applyShiftConstraint(start: Point, end: Point, tool: Tool): Point {
  if (tool === "line" || tool === "arrow") {
    return constrainTo45Degrees(start, end);
  }
  if (tool === "rectangle" || tool === "ellipse") {
    return constrainToSquare(start, end);
  }
  return end;
}

interface UseDrawingOptions {
  color: string;
  lineWidth: number;
  enabled: boolean;
  tool: Tool;
}

export function useDrawing({ color, lineWidth, enabled, tool }: UseDrawingOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const currentPointsRef = useRef<Point[]>([]);
  const previewStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d") ?? null, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "text") {
      if (!stroke.text || !stroke.position) return;
      ctx.fillStyle = stroke.color;
      ctx.font = `${stroke.width * 3}px system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(stroke.text, stroke.position.x, stroke.position.y);
      return;
    }

    if (stroke.tool === "pen") {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      return;
    }

    const start = stroke.start;
    const end = stroke.end;
    if (!start || !end) return;

    if (stroke.tool === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      return;
    }

    if (stroke.tool === "rectangle") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      ctx.strokeRect(x, y, w, h);
      return;
    }

    if (stroke.tool === "ellipse") {
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (stroke.tool === "arrow") {
      const headLength = Math.max(10, stroke.width * 3);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();
    }
  }, []);

  const replayStrokes = useCallback((strokes: Stroke[], preview?: Stroke | null) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
    if (preview) drawStroke(ctx, preview);
  }, [drawStroke, getCtx]);

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
      // Text tool is handled by Canvas.tsx click handler, not pointer drawing
      if (tool === "text") return;
      
      isDrawingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const ctx = getCtx();
      if (!ctx) return;
      if (tool === "pen") {
        currentPointsRef.current = [pt];
        previewStrokeRef.current = null;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(pt.x, pt.y);
      } else {
        currentPointsRef.current = [];
        previewStrokeRef.current = {
          tool,
          color,
          width: lineWidth,
          start: pt,
          end: pt,
        };
        replayStrokes(strokesRef.current, previewStrokeRef.current);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      let pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      // Apply Shift key constraints for shapes
      if (e.shiftKey && previewStrokeRef.current?.start && tool !== "pen" && tool !== "text") {
        pt = applyShiftConstraint(previewStrokeRef.current.start, pt, tool);
      }

      if (tool === "pen") {
        currentPointsRef.current.push(pt);
        const ctx = getCtx();
        if (!ctx) return;
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      } else if (previewStrokeRef.current?.start) {
        previewStrokeRef.current = {
          ...previewStrokeRef.current,
          end: pt,
        };
        replayStrokes(strokesRef.current, previewStrokeRef.current);
      }
    };

    const onUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (tool === "pen") {
        const points = [...currentPointsRef.current];
        if (points.length > 1) {
          strokesRef.current = [
            ...strokesRef.current,
            { tool: "pen", points, color, width: lineWidth },
          ];
        }
      } else if (previewStrokeRef.current?.start && previewStrokeRef.current.end) {
        const { start, end } = previewStrokeRef.current;
        if (Math.abs(end.x - start.x) > 0.5 || Math.abs(end.y - start.y) > 0.5) {
          strokesRef.current = [...strokesRef.current, previewStrokeRef.current];
        }
      }
      redoStackRef.current = []; // clear redo on new stroke
      currentPointsRef.current = [];
      previewStrokeRef.current = null;
      replayStrokes(strokesRef.current);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [enabled, color, lineWidth, tool, getCtx, replayStrokes]);

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
    previewStrokeRef.current = null;
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [getCtx]);

  const addTextStroke = useCallback((text: string, x: number, y: number, textColor: string, textWidth: number) => {
    strokesRef.current = [
      ...strokesRef.current,
      {
        tool: "text",
        text,
        position: { x, y },
        color: textColor,
        width: textWidth,
      },
    ];
    redoStackRef.current = [];
    replayStrokes(strokesRef.current);
  }, [replayStrokes]);

  return { canvasRef, undo, redo, clear, addTextStroke };
}
