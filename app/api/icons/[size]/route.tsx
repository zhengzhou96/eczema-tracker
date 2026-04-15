import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  return params.then(({ size }) => {
    const dim = Math.min(Math.max(parseInt(size, 10) || 192, 16), 1024);
    const radius = Math.floor(dim * 0.18);
    const fontSize = Math.floor(dim * 0.34);

    return new ImageResponse(
      (
        <div
          style={{
            width: dim,
            height: dim,
            background: "#9fe870",
            borderRadius: radius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            fontSize,
            color: "#163300",
            letterSpacing: "-0.02em",
          }}
        >
          ET
        </div>
      ),
      { width: dim, height: dim },
    );
  });
}
