import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same monogram as carmessievelvet-web's favicon (`icon.tsx` there) — this
// admin has no separate icon-only mark either (the real logo is a
// wordmark-only SVG), and it's the same brand, so reusing the same "C"
// keeps the two apps' browser tabs visually related instead of one
// staying on the generic default Next.js icon this replaces. System sans
// stack on purpose, not Archivo — see the storefront's `icon.tsx` for why
// (indistinguishable at this size, avoids a build-time font fetch).
export default function Icon() {
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
          fontSize: 22,
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
