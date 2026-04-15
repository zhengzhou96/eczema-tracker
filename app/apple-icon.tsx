import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#9fe870",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          fontWeight: 900,
          fontSize: 62,
          color: "#163300",
          letterSpacing: "-0.02em",
        }}
      >
        ET
      </div>
    ),
    { width: 180, height: 180 },
  );
}
