import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "AutoSeater — Seating Chart Maker";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#2563EB",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            marginBottom: 24,
            letterSpacing: "-0.02em",
          }}
        >
          AutoSeater
        </div>
        <div
          style={{
            fontSize: 32,
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: 48,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          The seating chart tool that doesn&apos;t charge you monthly
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 16,
            padding: "16px 40px",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "white",
            }}
          >
            $14.99 one-time
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
