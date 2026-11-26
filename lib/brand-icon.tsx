import { ImageResponse } from "next/og";

const PAPER = "#f8f2e4";
const TERRACOTTA = "#a24112";

/**
 * Icono provisional: una "E" hecha con tres lomos horizontales sobre terracota.
 * `scale` reduce el dibujo para el icono maskable (zona segura del 80 %).
 */
export function brandIcon(size: number, scale = 1) {
  const u = (size * scale) / 100; // unidad: 1 % del dibujo
  const ox = (size - size * scale) / 2;
  const oy = ox;
  const rect = (x: number, y: number, w: number, h: number, opacity = 1) => (
    <div
      style={{
        position: "absolute",
        left: ox + x * u,
        top: oy + y * u,
        width: w * u,
        height: h * u,
        background: PAPER,
        opacity,
        borderRadius: 2 * u,
      }}
    />
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          position: "relative",
          background: TERRACOTTA,
        }}
      >
        {rect(27, 22, 13, 56)}
        {rect(27, 22, 46, 13)}
        {rect(27, 43.5, 38, 13)}
        {rect(27, 65, 46, 13)}
      </div>
    ),
    { width: size, height: size },
  );
}
