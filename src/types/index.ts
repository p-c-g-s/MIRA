export interface Point { x: number; y: number; }

export interface Stroke {
  points: Point[];
  color: string;   // raw CSS color e.g. "#ef4444"
  width: number;   // logical pixels: 3 | 6 | 12
}

export const PRESET_COLORS = [
  "#ffffff", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6",
] as const;
export type PresetColor = typeof PRESET_COLORS[number];

export const PEN_SIZES = [3, 6, 12] as const;
export type PenSize = typeof PEN_SIZES[number];
