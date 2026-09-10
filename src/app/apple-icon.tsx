import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same monogram as `icon.tsx`, scaled up — see that file for why.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4b1530",
          color: "#fffdfb",
          fontSize: 120,
          fontWeight: 900,
          fontFamily: "system-ui, -apple-system, Helvetica, Arial, sans-serif",
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
