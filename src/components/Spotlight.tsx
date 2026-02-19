interface SpotlightProps { x: number; y: number; radius?: number; }

export function Spotlight({ x, y, radius = 40 }: SpotlightProps) {
  return (
    <div
      className="pointer-events-none fixed"
      style={{
        left: x - radius, top: y - radius,
        width: radius * 2, height: radius * 2,
        borderRadius: "50%",
        border: "3px solid rgba(255,255,255,0.85)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 0 12px rgba(255,255,255,0.4)",
        backdropFilter: "brightness(1.15)",
      }}
    />
  );
}
